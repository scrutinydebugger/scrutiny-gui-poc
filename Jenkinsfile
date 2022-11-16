pipeline {
    agent {
        label 'docker'
    }
    stages {
        stage ('Docker') {
            agent {
                dockerfile {
                    args '-e HOME=/tmp -e BUILD_CONTEXT=ci'
                    reuseNode true
                }
            }
            stages {
                stage ('Unit tests') {
                    steps {
                        sh '''
                        npm install
                        npm test
                        '''
                    }
                }
            }
        }
    }
}
