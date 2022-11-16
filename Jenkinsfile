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
                    steps {'npm install'}
                    steps {'npm run build'}
                    steps {'npm test'}
                }
            }
        }
    }
}
