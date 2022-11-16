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
                stage ('Setup') {
                    steps {
                        sh 'npm install'
                    }
                }
                stage ('Build') {
                    steps {
                        sh 'npm run build'
                    }
                }
                stage ('Unit tests') {
                    steps { 
                        sh 'npm test'
                    }
                }
            }
        }
    }
}
