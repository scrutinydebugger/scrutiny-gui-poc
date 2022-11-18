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
                stage ('Build') {
                    steps {
                        sh 'scripts/build.sh'
                    }
                }
                stage ('Unit tests') {
                    steps { 
                        sh 'scripts/runtests.sh'
                    }
                }
            }
        }
    }
}
